<?php
namespace Grav\Plugin;

use Grav\Common\Plugin;

/**
 * Photo Metadata
 *
 * Stellt die Einstellungen für EXIF- und GPS-Anzeige den Templates bereit.
 * Die Bearbeitung der Metadaten (meta.yaml) folgt in einem späteren Schritt.
 */
class PhotoMetadataPlugin extends Plugin
{
    public static function getSubscribedEvents(): array
    {
        return [
            'onTwigSiteVariables' => ['onTwigSiteVariables', 0],
        ];
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
