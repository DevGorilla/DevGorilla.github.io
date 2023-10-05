const _ = require('lodash');
const sharp = require('sharp');

const glob = require('glob-promise');
const { readFile, writeFile, unlink } = require('fs').promises;

const ResizeWidth = 1024;

const dirForProcessing = [
    'projects',
    'racing',
    'UNUSED',
    'why',
    'links',
    'misc',
    'food'
]

const imageTypes = [
    'jpg',
    'jpeg',
    // 'gif'
]
const resizedSuffix= '_resized'


function convertMbToByte(mbs) {
  const byte = 1;
  const kb = byte * 1000;
  const mb = kb * 1000;
  return mbs * mb;
}

function convertByteToMB(bytes) {
  const byte = 1;
  const kb = byte * 1000;
  const mb = kb * 1000;
  return bytes / mb;
}


async function processImage(imageBuffer) {
  if (imageBuffer.byteLength === 0) throw new Error('Image Buffer Empty');

  // we can only specify pixel width on resize
  // 16-bit image 1mb == 1024 X 512
  // Note global variable above, "ResizeWidth"
  const mbLimitToResize = 1.5;

  let newImageBuffer = imageBuffer;

  if (imageBuffer.byteLength > convertMbToByte(mbLimitToResize)) {
    // console.log('Resizing image with Sharp');
    newImageBuffer = await sharp(imageBuffer)
      .resize(ResizeWidth) // Only 1 dimension has the second dimension dynamic resulting in no-crop
      .withMetadata() // preserves Rotation
      .jpeg({ mozjpeg: true })
      .toBuffer(); // @ 2000 wide sharp produces sub 1MB files from 41MB files (frontend max now is 40mb)

    console.log(`Old Byte size: ${convertByteToMB(imageBuffer.byteLength)} \n New Image Size = ${convertByteToMB(newImageBuffer.byteLength)}MB`);

    if (newImageBuffer.byteLength > convertMbToByte(15)) {
      throw new Error('Image too big after resize');
    }
  }

  return newImageBuffer;
}

// Allows me to name something as a Banner for extra wide img
function needsResize(loc){
    return (!loc.includes(resizedSuffix) && !loc.includes('Banner'))

}

function isImage(loc){
    const type = imageTypes.filter((type) => {
        const re = new RegExp(`\./.*${type}`);
        return loc.match(re)
    })
    return type.length;
}


async function getImages(src) {
    const dirs = await glob.promise(src + '/**/*');
    const imageLocations = dirs.filter((loc) => {
        return (isImage(loc) && needsResize(loc))
    })
    return imageLocations;
}


async function main(){
    // 1. Get Images to Process
    const images = [];
    for (let i = 0; i < dirForProcessing.length; i++) {
        const imgs = await getImages(dirForProcessing[i]);
        images.push(...imgs)
    }

    console.log(`${images.length} images to resize`)
    
    // 2. Synchronously resizes, saves new image and deletes old.
    for (let i = 0; i < images.length; i++) {
        const imgBuffer = await readFile(images[i]);
        const newBuffer = await processImage(imgBuffer);

        const extension = images[i].match(/\.[^/.]+$/);
        const name = images[i].replace(/\.[^/.]+$/, "");
        const newName = `${name}${resizedSuffix}${extension}`;
        console.log(`image - ${newName}`);
        await writeFile(newName, newBuffer); // resave regardless 
        await unlink(images[i]); // delete old file
    }
    console.log(`${images.length} DONE`);
}

main();