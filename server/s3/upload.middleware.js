import multer from 'multer';

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only image files allowed'), false);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});




/**
  Note : storage: multer.memoryStorage(),/*Do not save files to disk. Instead accumulate the file bytes in RAM---- >So when Busboy(Multer own parser) streams the image data, multer does something like:

empty buffer
   ↓
append image chunk
   ↓
append image chunk
   ↓
append image chunk

Eventually it builds a buffer like:

Buffer <89 50 4E 47 ... >

That is literally the binary image in memory.
*/
 