const fs = require('fs');
const PDFDocument = require('pdfkit');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('/home/naxareth/Documents/vector-system/testing/pdf_gen/John_Doe_Credential.pdf'));

// Header
doc.fontSize(28).font('Helvetica-Bold').text('PHINMA University', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(16).font('Helvetica').text('College of Information Technology', { align: 'center' });
doc.moveDown(2);

// Title
doc.fontSize(22).font('Helvetica-Oblique').text('Certificate of Graduation', { align: 'center' });
doc.moveDown(1.5);

// Body
doc.fontSize(14).font('Helvetica').text('This is to certify that', { align: 'center' });
doc.moveDown(1);
doc.fontSize(24).font('Helvetica-Bold').text('John Doe', { align: 'center' });
doc.moveDown(1);
doc.fontSize(14).font('Helvetica').text('has successfully completed the degree of', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(18).font('Helvetica-Bold').text('Bachelor of Science in Information Technology', { align: 'center' });
doc.moveDown(2);

// Metadata for AI
doc.fontSize(12).font('Helvetica').text('Date Issued: May 15, 2026', { align: 'left' });
doc.text('Credential Number: IT-2026-89321', { align: 'left' });
doc.moveDown(1);
doc.font('Helvetica-Bold').text('Acquired Skills:');
doc.font('Helvetica').text('• Software Engineering\n• Database Management\n• React.js & Node.js\n• Cloud Computing');

doc.end();
console.log('PDF Generated successfully!');
