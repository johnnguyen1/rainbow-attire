import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase-client';

export async function uploadImage(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteImage(path: string): Promise<void> {
  await deleteObject(ref(storage, path)).catch(() => {
    // Already gone; nothing to do
  });
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    image.src = url;
  });
}
