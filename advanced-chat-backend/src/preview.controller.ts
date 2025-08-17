import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
// FIX: Changed the import to a require statement for compatibility with untyped JavaScript modules.
const { getLinkPreview } = require('link-preview-js');

@Controller('preview')
export class PreviewController {
  @Get()
  async getPreview(@Query('url') url: string) {
    if (!url) {
      throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const previewData: any = await getLinkPreview(url, {
        timeout: 8000 // Timeout in milliseconds (e.g., 8 seconds)
      });

      // Prepare a response object based on the content type
      const response = {
        url: previewData.url,
        title: previewData.title,
        description: undefined,
        image: undefined,
        siteName: previewData.siteName,
        contentType: previewData.contentType, // Pass content type to the frontend
        audioUrl: undefined, // New property for audio links
      };

      // Scenario 1: If the link is a direct image
      if (previewData.contentType?.startsWith('image/')) {
        response.image = previewData.url; // The image is the URL itself
      } 
      // Scenario 2: If the link is an audio file
      else if (previewData.contentType?.startsWith('audio/')) {
        response.audioUrl = previewData.url; // The direct URL to the audio file
        response.description = previewData.description || previewData.title;
        response.image = previewData.images?.[0]; // Use album art if available
      }
      // Scenario 3: If the link is a video
      else if (previewData.contentType?.startsWith('video/')) {
        response.image = previewData.images?.[0]; // Use the thumbnail
        response.description = previewData.description; // Also include description if available
      }
      // Scenario 4: For all other links (articles, websites, etc.)
      else {
        response.description = previewData.description;
        response.image = previewData.images?.[0]; // Include image if one is found
      }

      return response;

    } catch (error) {
      console.error('Link preview error:', error);
      throw new HttpException('Could not generate preview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
