import { MongoClient } from 'mongodb';
import dns from 'dns';

// Solución para errores "querySrv ECONNREFUSED" en ciertos routers/redes al resolver SRV de MongoDB
if (typeof dns.setServers === 'function') {
  try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  } catch (e) {
    console.warn('No se pudieron configurar los DNS públicos para la conexión de MongoDB:', e);
  }
}

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} else {
  // If not configured, assign a promise that rejects so that it can be caught gracefully
  clientPromise = Promise.reject(
    new Error('MongoDB connection URI (MONGODB_URI) is not configured.')
  );
}

export default clientPromise;
