const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

const signPDF = async (filePath, signatureData, user, signatureImage) => {
  try {
    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // 1. Get Actual PDF Dimensions
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();

    // 2. Calculate Scale Factor
    // If viewportWidth was 600, and pdfWidth is 1200, scale is 2.
    const viewportWidth = signatureData.viewportWidth || 600;
    const scaleFactor = pdfWidth / viewportWidth;

    // 3. Scale All Coordinates
    const scaledX = signatureData.x * scaleFactor;
    const scaledY = signatureData.y * scaleFactor;
    const scaledWidth = (signatureData.width || 192) * scaleFactor;
    const scaledHeight = (signatureData.height || 64) * scaleFactor;

    // 4. Calculate Bottom Y (Anchor to bottom)
    // Formula: PageHeight - (ScaledY + ScaledBoxHeight)
    // Note: 'scaledY' is the Top of the box from the web. 
    // Adding scaledBoxHeight gets us to the Bottom of the box in Web coords.
    // Subtracting that from PageHeight converts it to PDF Bottom-Up coords.
    const pdfBottomY = pdfHeight - (scaledY + scaledHeight);

    if (signatureImage) {
      const pngImage = await pdfDoc.embedPng(signatureImage);
      
      // Draw image
      firstPage.drawImage(pngImage, {
        x: scaledX,
        y: pdfBottomY, 
        width: scaledWidth,
        height: scaledHeight,
      });
    } else {
      // Fallback text
      firstPage.drawText(`Signed by: ${user.name}`, {
        x: scaledX,
        y: pdfBottomY + (5 * scaleFactor),
        size: 14 * scaleFactor,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const newFilePath = filePath.replace('.pdf', '-signed.pdf');
    fs.writeFileSync(newFilePath, pdfBytes);

    return newFilePath;
  } catch (error) {
    console.error("PDF Sign Error:", error);
    throw new Error('Failed to sign PDF');
  }
};

module.exports = signPDF;