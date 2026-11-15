// Lazily loads TensorFlow.js only when a visitor explicitly opts in. Nothing here runs at page load.
// preferGpu tries the WebGL backend first and falls back to the CPU backend.
export async function loadTensorflow({preferGpu=false}={}){
 const tf=await import('@tensorflow/tfjs-core');
 await import('@tensorflow/tfjs-backend-cpu');
 if(preferGpu){
  try{await import('@tensorflow/tfjs-backend-webgl');if(await tf.setBackend('webgl')){await tf.ready();return tf}}catch{}
 }
 if(!(await tf.setBackend('cpu')))throw new Error('No TensorFlow.js backend could be initialized');
 await tf.ready();
 return tf;
}
