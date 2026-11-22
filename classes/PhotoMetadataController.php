<?php
declare(strict_types=1);

namespace Grav\Plugin\PhotoMetadata;

use Grav\Plugin\Api\Controllers\AbstractApiController;
use Grav\Plugin\Api\Exceptions\NotFoundException;
use Grav\Plugin\Api\Exceptions\ValidationException;
use Grav\Plugin\Api\Response\ApiResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

/**
 * API für die Admin2-Seite „Foto-Metadaten“.
 *
 * Die Metadaten liegen als Grav-Sidecar neben dem Bild: `<bild>.<ext>.meta.yaml`.
 * Geschrieben wird nur für Bilder, die tatsächlich zu einer Seite gehören.
 */
class PhotoMetadataController extends AbstractApiController
{
    /** GET /photo-metadata/images?route=/alben/aviation — Bilder einer Seite. */
    public function images(ServerRequestInterface $request): ResponseInterface
    {
        $this->requirePermission($request, 'api.media.read');

        $page = $this->resolvePage($request);

        $items = [];
        foreach ($page->media()->images() as $name => $medium) {
            $items[] = [
                'file' => $name,
                'url'  => $medium->url(),
                'info' => $this->fileInfo($page, $name),
                'meta' => $this->readSidecar($this->sidecarPath($page, $name)),
            ];
        }

        return ApiResponse::create($items);
    }

    /** GET /photo-metadata/meta?route=…&file=… — Sidecar eines Bildes als Rohtext. */
    public function getMeta(ServerRequestInterface $request): ResponseInterface
    {
        $this->requirePermission($request, 'api.media.read');

        $page = $this->resolvePage($request);
        $file = $this->resolveImage($request, $page);

        return ApiResponse::create($this->metaResponse($page, $file));
    }

    /** PUT /photo-metadata/meta — Sidecar eines Bildes ersetzen. Body: { route, file, yaml }. */
    public function putMeta(ServerRequestInterface $request): ResponseInterface
    {
        $this->requirePermission($request, 'api.media.write');

        $body = $this->getRequestBody($request);
        $page = $this->resolvePage($request, (string) ($body['route'] ?? ''));
        $file = $this->resolveImage($request, $page, (string) ($body['file'] ?? ''));

        $yaml = (string) ($body['yaml'] ?? '');
        $data = $this->parseYaml($yaml);

        $sidecar = $this->sidecarPath($page, $file);
        if ($data === []) {
            if (is_file($sidecar)) {
                unlink($sidecar);
            }
        } else {
            file_put_contents($sidecar, Yaml::dump($data, 4, 2));
        }

        return ApiResponse::create($this->metaResponse($page, $file));
    }

    /* ------------------------------------------------------------------ */

    private function resolvePage(ServerRequestInterface $request, ?string $route = null): \Grav\Common\Page\Interfaces\PageInterface
    {
        // Die API schaltet die Seitenverarbeitung für API-Anfragen ab (disablePages), dann ist der
        // Seitenindex leer und find() liefert immer null. Wie der API-Seitencontroller einschalten.
        $this->grav['pages']->enablePages();

        $route ??= (string) ($request->getQueryParams()['route'] ?? '');
        $page = $route !== '' ? $this->grav['pages']->find($route, true) : null;
        if (!$page) {
            $this->logPageNotFound($route);
            throw new NotFoundException('Seite nicht gefunden: ' . ($route !== '' ? $route : '(leer)'));
        }
        return $page;
    }

    /**
     * Schreibt eine Diagnose ins Grav-Log (Warnung, Kanal „grav“), wenn eine Seite nicht
     * aufgelöst werden kann: Ergebnisse von find(), Elternseite mit Kindern, Ordner auf der Festplatte.
     */
    private function logPageNotFound(string $route): void
    {
        try {
            $pages = $this->grav['pages'];
            $parts = explode('/', trim($route, '/'));
            $lines = ['route=' . $route, 'parts=' . implode(' > ', $parts)];

            $found = $pages->find($route, true);
            $lines[] = 'find(route,true)=' . ($found ? 'Treffer:' . $found->route() : 'null');
            $found = $pages->find($route);
            $lines[] = 'find(route)=' . ($found ? 'Treffer' : 'null');

            $parentRoute = '/' . implode('/', array_slice($parts, 0, -1));
            $parent = $pages->find($parentRoute, true);
            $lines[] = 'parent=' . $parentRoute . ' ' . ($parent ? 'gefunden' : 'nicht gefunden');
            if ($parent) {
                $kids = [];
                foreach ($parent->children() as $child) {
                    $kids[] = $child->route();
                }
                $lines[] = 'kinder-des-parent=[' . implode(', ', $kids) . ']';
            }

            $pagesDir = (string) $this->grav['locator']->findResource('page://', true);
            $lines[] = 'page://=' . $pagesDir;
            $dir = $pagesDir;
            foreach ($parts as $seg) {
                $match = null;
                foreach (scandir($dir) ?: [] as $name) {
                    if ($name[0] !== '.' && is_dir($dir . '/' . $name) && preg_replace('/^\d+\./', '', $name) === $seg) {
                        $match = $name;
                        break;
                    }
                }
                if ($match === null) {
                    $lines[] = 'ordner fuer "' . $seg . '" in ' . $dir . ' NICHT gefunden';
                    break;
                }
                $dir .= '/' . $match;
            }
            if (is_dir($dir)) {
                $md = array_map('basename', glob($dir . '/*.md') ?: []);
                $lines[] = 'ordner=' . $dir . ' md=[' . implode(', ', $md) . ']';
            }

            $this->grav['log']->warning('[photo-metadata] ' . implode(' | ', $lines));
        } catch (\Throwable $e) {
            $this->grav['log']->warning('[photo-metadata] Diagnose fehlgeschlagen: ' . $e->getMessage());
        }
    }

    /** Prüft, dass der Dateiname ein Bild der Seite ist. Verhindert Pfadtricks. */
    private function resolveImage(ServerRequestInterface $request, $page, ?string $file = null): string
    {
        $file ??= (string) ($request->getQueryParams()['file'] ?? '');
        $images = $page->media()->images();
        if ($file === '' || !isset($images[$file])) {
            throw new NotFoundException('Bild nicht auf dieser Seite gefunden.');
        }
        return $file;
    }

    /** @return array{width: ?int, height: ?int, size: ?int, modified: ?int} */
    private function fileInfo($page, string $file): array
    {
        $path = $page->path() . DIRECTORY_SEPARATOR . $file;
        $exists = is_file($path);
        $dims = $exists ? @getimagesize($path) : false;
        return [
            'width'    => is_array($dims) ? (int) $dims[0] : null,
            'height'   => is_array($dims) ? (int) $dims[1] : null,
            'size'     => $exists ? (int) filesize($path) : null,
            'modified' => $exists ? (int) filemtime($path) : null,
        ];
    }

    private function sidecarPath($page, string $file): string
    {
        return $page->path() . DIRECTORY_SEPARATOR . $file . '.meta.yaml';
    }

    /** @return array<string, mixed> */
    private function readSidecar(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }
        $data = Yaml::parseFile($path);
        return is_array($data) ? $data : [];
    }

    /** @return array<string, mixed> */
    private function metaResponse($page, string $file): array
    {
        $path = $this->sidecarPath($page, $file);
        $raw = is_file($path) ? (string) file_get_contents($path) : '';

        return [
            'route'  => $page->route(),
            'file'   => $file,
            'url'    => $page->media()->images()[$file]->url(),
            'info'   => $this->fileInfo($page, $file),
            'yaml'   => $raw,
            'values' => $this->readSidecar($path),
        ];
    }

    /** @return array<string, mixed> */
    private function parseYaml(string $yaml): array
    {
        if (trim($yaml) === '') {
            return [];
        }
        try {
            $data = Yaml::parse($yaml);
        } catch (ParseException $e) {
            throw new ValidationException('Ungültiges YAML: ' . $e->getMessage());
        }
        if ($data === null) {
            return [];
        }
        if (!is_array($data) || array_is_list($data)) {
            throw new ValidationException('Die Metadaten müssen ein YAML-Objekt mit Schlüsseln sein.');
        }
        return $data;
    }
}
