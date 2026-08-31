export interface CompressedFileResult {
  base64: string;
  fileName: string;
  fileType: string;
  sizeKb: number;
  originalSizeKb: number;
  compressed: boolean;
}

/**
 * Compresses an image file to ensure it is 150 KB or less.
 * Non-image files (e.g., PDFs) are read directly as base64 without canvas encoding.
 */
export async function compressImageFile(
  file: File,
  maxSizeBytes: number = 150 * 1024
): Promise<CompressedFileResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const sizeKb = Math.round((base64.length * 3) / 4 / 1024);
        resolve({
          base64,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          sizeKb,
          originalSizeKb,
          compressed: false
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limit initial maximum dimension for high-res screenshots
        const maxInitialDimension = 1600;
        if (width > maxInitialDimension || height > maxInitialDimension) {
          if (width > height) {
            height = Math.round((height * maxInitialDimension) / width);
            width = maxInitialDimension;
          } else {
            width = Math.round((width * maxInitialDimension) / height);
            height = maxInitialDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2d context unavailable'));
          return;
        }

        // Fill white background (useful for transparent PNGs converted to JPEG)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let outputDataUrl = canvas.toDataURL('image/jpeg', quality);
        let estimatedBytes = (outputDataUrl.length * 3) / 4;

        // Iteratively step down quality and canvas resolution if needed
        let attempts = 0;
        while (estimatedBytes > maxSizeBytes && attempts < 12) {
          attempts++;
          if (quality > 0.3) {
            quality -= 0.15;
          } else {
            // Downscale dimensions by 20%
            width = Math.max(200, Math.round(width * 0.8));
            height = Math.max(200, Math.round(height * 0.8));
            canvas.width = width;
            canvas.height = height;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            quality = 0.65;
          }
          outputDataUrl = canvas.toDataURL('image/jpeg', quality);
          estimatedBytes = (outputDataUrl.length * 3) / 4;
        }

        const finalKb = Math.round(estimatedBytes / 1024);
        const originalExt = file.name.split('.').pop() || '';
        const baseName = file.name.substring(0, file.name.length - (originalExt ? originalExt.length + 1 : 0));
        const finalFileName = `${baseName}_compressed.jpg`;

        resolve({
          base64: outputDataUrl,
          fileName: finalFileName,
          fileType: 'image/jpeg',
          sizeKb: finalKb,
          originalSizeKb,
          compressed: true
        });
      };

      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
