<?php
namespace Grav\Plugin;

use Grav\Common\Plugin;
use Grav\Common\Utils;
use Grav\Plugin\Admin\Admin;
use RocketTheme\Toolbox\Event\Event;
use Symfony\Component\Yaml\Yaml;

/**
 * Photo Metadata
 *
 * Stellt die Einstellungen für EXIF- und GPS-Anzeige den Templates bereit und
 * bearbeitet die Bild-Metadaten im Admin (Batch-Seite pro Seite/Album).
 *
 * Metadaten liegen als Grav-Sidecar neben dem Bild: `<bild>.<ext>.meta.yaml`.
 */
class PhotoMetadataPlugin extends Plugin
{
    /** Felder, die der Batch-Editor schreibt. Andere Schlüssel bleiben unangetastet. */
    private const EDITABLE_FIELDS = ['title', 'description', 'alt', 'keywords', 'author'];

    private const ADMIN_ROUTE = 'photo-metadata';
    private const SAVE_TASK_METHOD = 'taskSavePhotoMetadata';

    public static function getSubscribedEvents(): array
    {
        return [
            'onTwigSiteVariables'        => ['onTwigSiteVariables', 0],
            'onAdminMenu'                => ['onAdminMenu', 0],
            'onAdminTwigTemplatePaths'   => ['onAdminTwigTemplatePaths', 0],
            'onAdminPage'                => ['onAdminPage', 0],
            'onAdminTaskExecute'         => ['onAdminTaskExecute', 0],
            'onAssetsInitialized'        => ['onAssetsInitialized', 0],
        ];
    }

    /**
     * Ergänzt im Admin auf der Seiten-Bearbeitung jede Medienkarte um einen Button,
     * der die Metadaten dieses Bildes im Batch-Editor öffnet.
     */
    public function onAssetsInitialized(): void
    {
        if (!$this->isAdmin()) {
            return;
        }

        $this->grav['assets']->addInlineJs($this->buttonScript());
    }

    private function buttonScript(): string
    {
        $title = 'Foto-Metadaten öffnen';
        $editorRoute = self::ADMIN_ROUTE;

        return <<<JS
(function () {
    var match = location.pathname.match(/^(.*)\/pages(?:\/edit)?(\/.*)$/);
    if (!match) { return; }
    var editorUrl = match[1] + '/{$editorRoute}';
    var route = match[2];
    var camera = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>';

    function addButtons() {
        document.querySelectorAll('button[title="Edit metadata"]').forEach(function (editBtn) {
            var group = editBtn.parentElement;
            var row = group && group.parentElement;
            if (!row || row.querySelector('[data-photo-metadata]')) { return; }
            var nameEl = row.querySelector('span.truncate');
            if (!nameEl) { return; }

            var btn = editBtn.cloneNode(false);
            btn.setAttribute('data-photo-metadata', '');
            btn.setAttribute('title', '{$title}');
            btn.innerHTML = camera;
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                location.href = editorUrl + '?page=' + encodeURIComponent(route) + '#pm-' + encodeURIComponent(nameEl.textContent.trim());
            });
            editBtn.insertAdjacentElement('afterend', btn);
        });
    }

    function start() {
        new MutationObserver(addButtons).observe(document.documentElement, { childList: true, subtree: true });
        addButtons();
    }

    // Das Skript kann im <head> stehen, dann gibt es noch keinen body.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
JS;
    }

    public function onTwigSiteVariables(): void
    {
        $settings = [
            'show_exif' => (bool) $this->config->get('plugins.photo-metadata.show_exif', true),
            'show_gps'  => (bool) $this->config->get('plugins.photo-metadata.show_gps', false),
        ];

        // Seiten-Übersteuerung über den Header: photo_metadata: { show_exif: ..., show_gps: ... }
        $page = $this->grav['page'] ?? null;
        $header = $page ? $page->header() : null;
        $override = is_object($header) ? ($header->photo_metadata ?? null) : ($header['photo_metadata'] ?? null);

        if (is_object($override)) {
            $override = (array) $override;
        }

        if (is_array($override)) {
            foreach (['show_exif', 'show_gps'] as $key) {
                if (array_key_exists($key, $override)) {
                    $value = filter_var($override[$key], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                    if ($value !== null) {
                        $settings[$key] = $value;
                    }
                }
            }
        }

        $this->grav['twig']->twig_vars['photo_metadata'] = $settings;
    }

    /* ---------------------------------------------------------------------
     * Admin: Batch-Editor
     * ------------------------------------------------------------------- */

    public function onAdminMenu(): void
    {
        $this->grav['twig']->plugins_hooked_nav['Foto-Metadaten'] = [
            'route'     => self::ADMIN_ROUTE,
            'icon'      => 'fa-camera',
            'authorize' => ['admin.login', 'admin.super'],
            'priority'  => 0,
        ];
    }

    public function onAdminTwigTemplatePaths(Event $event): void
    {
        $paths = &$event['paths'];
        $paths[] = __DIR__ . '/templates';
    }

    public function onAdminPage(Event $event): void
    {
        if (!$this->isBatchRoute()) {
            return;
        }

        /** @var \Grav\Common\Page\Page $page */
        $page = $event['page'];
        $page->init(new \SplFileInfo(__DIR__ . '/pages/admin/' . self::ADMIN_ROUTE . '.md'));

        $pagePath = (string) $this->grav['uri']->query('page');
        $target = $pagePath !== '' ? $this->grav['pages']->find($pagePath) : null;

        $twig = $this->grav['twig'];
        $twig->twig_vars['photo_metadata_page'] = $target ? $target->route() : '';
        $twig->twig_vars['photo_metadata_items'] = $target ? $this->collectItems($target) : [];
        $twig->twig_vars['photo_metadata_nonce'] = Admin::getNonce();
        $twig->twig_vars['photo_metadata_fields'] = self::EDITABLE_FIELDS;
    }

    public function onAdminTaskExecute(Event $event): bool
    {
        if (($event['method'] ?? null) !== self::SAVE_TASK_METHOD) {
            return false;
        }

        /** @var \Grav\Plugin\Admin\AdminBaseController $controller */
        $controller = $event['controller'];
        $post = $_POST;

        $user = $this->grav['user'];
        if (!$user->authorize('admin.login') && !$user->authorize('admin.super')) {
            $controller->admin->setMessage('Keine Berechtigung.', 'error');
            return true;
        }

        if (!Utils::verifyNonce($post['admin-nonce'] ?? '', 'admin-form')) {
            $controller->admin->setMessage('Ungültiges Formular-Token.', 'error');
            return true;
        }

        $page = $this->grav['pages']->find((string) ($post['page'] ?? ''));
        if (!$page) {
            $controller->admin->setMessage('Seite nicht gefunden.', 'error');
            return true;
        }

        $submitted = $post['photo_metadata'] ?? [];
        $saved = 0;

        foreach ($page->media()->images() as $name => $medium) {
            // Nur Dateien schreiben, die tatsächlich zur Seite gehören (kein frei gewählter Pfad).
            if (!isset($submitted[$name]) || !is_array($submitted[$name])) {
                continue;
            }

            $sidecar = $this->sidecarPath($medium);
            $data = is_file($sidecar) ? (Yaml::parseFile($sidecar) ?: []) : [];

            foreach (self::EDITABLE_FIELDS as $field) {
                if (!array_key_exists($field, $submitted[$name])) {
                    continue;
                }
                $value = $this->normalizeValue($field, $submitted[$name][$field]);
                if ($value === null) {
                    unset($data[$field]);
                } else {
                    $data[$field] = $value;
                }
            }

            if ($data === []) {
                if (is_file($sidecar)) {
                    unlink($sidecar);
                }
                continue;
            }

            file_put_contents($sidecar, Yaml::dump($data, 4, 2));
            $saved++;
        }

        $controller->admin->setMessage("Metadaten gespeichert: {$saved} Bild(er).", 'info');
        return true;
    }

    private function isBatchRoute(): bool
    {
        $admin = $this->grav['admin'] ?? null;
        return $admin && $admin->getCurrentRoute() === self::ADMIN_ROUTE;
    }

    /**
     * @return array<int, array{name: string, url: string, values: array}>
     */
    private function collectItems($page): array
    {
        $items = [];
        foreach ($page->media()->images() as $name => $medium) {
            $sidecar = $this->sidecarPath($medium);
            $values = is_file($sidecar) ? (Yaml::parseFile($sidecar) ?: []) : [];

            $items[] = [
                'name'   => $name,
                'url'    => $medium->url(),
                'values' => $values,
            ];
        }
        return $items;
    }

    private function sidecarPath($medium): string
    {
        return $medium->path() . '.meta.yaml';
    }

    /**
     * Normalisiert einen Formularwert. Leere Werte ergeben null (= Feld entfernen).
     */
    private function normalizeValue(string $field, $raw)
    {
        if ($field === 'keywords') {
            $list = array_filter(array_map('trim', explode(',', (string) $raw)), 'strlen');
            return $list ? array_values($list) : null;
        }

        $value = trim((string) $raw);
        return $value === '' ? null : $value;
    }
}
