// Mock browser-image-compression for tests
// In test environment, just return the original file without actual compression
export default async function imageCompression(file: File): Promise<File> {
  // In tests, just return the original file (no compression needed)
  // Convert to JPEG type to match the library's behavior
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      const newFile = new File([blob], file.name, { type: 'image/jpeg' });
      resolve(newFile);
    };
    reader.readAsArrayBuffer(file);
  });
}

