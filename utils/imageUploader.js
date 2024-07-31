const cloudinary = require("cloudinary").v2

exports.uploadImageCloudinary = async(file,folder,height,quality) =>{
    const options = {folder};

    if(height) {
        options.height = height;
    }
    if(quality) {
        options.quality = quality;
    }
    options.resource_type = "auto";
    try {
      // console.log("Uploading file to Cloudinary with options:", options);
      const result = await cloudinary.uploader.upload(file.tempFilePath, options);
      // console.log("Upload result:", result);
      return result;
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      throw error;
    }
  

    
}

// Function to delete a resource by public ID
exports.deleteResourceFromCloudinary = async (url) => {
  if (!url) return;

  try {
    // Extract the public ID from the URL
    const urlParts = url.split('/');
    const versionPattern = /v\d+/;
    const publicIdParts = urlParts.slice(urlParts.findIndex(part => versionPattern.test(part)) + 1);
    const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, "");

    // Determine the resource type based on the URL
    const resourceType = url.includes('/video/') ? 'video' : 'image';

    // Delete the resource using the public ID and resource type
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Deleted resource with public ID: ${publicId}`);
    console.log('Delete Resource result = ', result);
    return result;
  } catch (error) {
    console.error(`Error deleting resource with public ID ${url}:`, error);
    throw error;
  }
};