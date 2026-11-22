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
        $this->grav['twig']->twig_vars['photo_metadata'] = [
            'show_exif' => (bool) $this->config->get('plugins.photo-metadata.show_exif', true),
            'show_gps'  => (bool) $this->config->get('plugins.photo-metadata.show_gps', false),
        ];
    }
}
