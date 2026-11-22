<?php
namespace Grav\Plugin;

use Grav\Common\Plugin;

/**
 * Photo Metadata
 *
 * Stellt die Einstellungen für EXIF- und GPS-Anzeige den Templates bereit,
 * auch pro Seite überschreibbar. Nur für Grav 2 mit Admin2.
 *
 * Admin2-Seite: admin-next/pages/photo-metadata.yaml und .js, API: classes/PhotoMetadataController.php.
 */
class PhotoMetadataPlugin extends Plugin
{
    public static function getSubscribedEvents(): array
    {
        return [
            'onTwigSiteVariables'     => ['onTwigSiteVariables', 0],
            'onApiRegisterRoutes'     => ['onApiRegisterRoutes', 0],
            'onApiSidebarItems'       => ['onApiSidebarItems', 0],
        ];
    }

    /** API-Routen für die Admin2-Seite. Nur geladen, wenn das API-Plugin aktiv ist. */
    public function onApiRegisterRoutes(\RocketTheme\Toolbox\Event\Event $event): void
    {
        // Fehlt der Ordner (unvollständige Installation), nur diese Seite weglassen.
        // Ein require_once auf eine fehlende Datei würde sonst jede API-Anfrage abbrechen.
        $controllerFile = __DIR__ . '/classes/PhotoMetadataController.php';
        if (!is_file($controllerFile)) {
            return;
        }
        require_once $controllerFile;

        $c = PhotoMetadata\PhotoMetadataController::class;
        $routes = $event['routes'];
        $routes->get('/photo-metadata/pages', [$c, 'pages']);
        $routes->get('/photo-metadata/images', [$c, 'images']);
        $routes->get('/photo-metadata/meta', [$c, 'getMeta']);
        $routes->put('/photo-metadata/meta', [$c, 'putMeta']);
    }

    /** Menüeintrag in der Admin2-Sidebar. */
    public function onApiSidebarItems(\RocketTheme\Toolbox\Event\Event $event): void
    {
        $items = $event['items'];
        $items[] = [
            'id'        => 'photo-metadata',
            'plugin'    => 'photo-metadata',
            'label'     => 'Foto-Metadaten',
            'icon'      => 'fa-camera',
            'route'     => '/plugin/photo-metadata',
            'priority'  => 0,
            'badge'     => null,
            'authorize' => 'api.media.read',
        ];
        $event['items'] = $items;
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
}
