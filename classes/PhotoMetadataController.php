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
    /**
     * GET /photo-metadata/pages — Seiten mit Bildern, dazu ihre Elternseiten,
     * damit sich der Baum im Admin zusammenhängend zeichnen lässt.
     */
    public function pages(ServerRequestInterface $request): ResponseInterface
    {
        $this->requirePermission($request, 'api.media.read');

        $pages = $this->grav['pages'];
        $items = [];

        // Alle Seiten aus all() (flach, Tiefe zuerst). Root() wirft in diesem Kontext
        // „Internal error“. Eintrag auflösen: als Seite, sonst über Route oder Schlüssel.
        $resolve = static function ($value) use ($pages): ?\Grav\Common\Page\Interfaces\PageInterface {
            if ($value instanceof \Grav\Common\Page\Interfaces\PageInterface) {
                return $value;
            }
            return is_string($value) || is_int($value) ? $pages->find((string) $value) : null;
        };

        foreach ($pages->all() as $key => $item) {
            $page = $resolve($item) ?? $resolve($key);
            if (!$page) {
                continue;
            }
            $count = count($page->media()->images());
            if ($count === 0) {
                continue;
            }
            $items[$page->route()] = [
                'route'  => $page->route(),
                'title'  => $page->title(),
                'images' => $count,
            ];
        }

        // Elternseiten ohne eigene Bilder ergänzen, damit der Baum nicht auseinanderfällt.
        foreach (array_keys($items) as $route) {
            $parts = explode('/', trim((string) $route, '/'));
            for ($i = count($parts) - 1; $i >= 1; $i--) {
                $ancestor = '/' . implode('/', array_slice($parts, 0, $i));
                if (isset($items[$ancestor])) {
                    continue;
                }
                $parent = $pages->find($ancestor);
                $items[$ancestor] = [
                    'route'  => $ancestor,
                    'title'  => $parent ? $parent->title() : basename($ancestor),
                    'images' => 0,
                ];
            }
        }

        ksort($items);

        return ApiResponse::create(array_values($items));
    }

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
        $route ??= (string) ($request->getQueryParams()['route'] ?? '');
        $page = $route !== '' ? $this->grav['pages']->find($route) : null;
        if (!$page) {
            throw new NotFoundException('Seite nicht gefunden.');
        }
        return $page;
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
