import { apiClient } from './client';

export async function getFeatures() {
  return (await apiClient.get('/config/features')).data.features;
}
