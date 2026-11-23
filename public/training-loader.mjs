import {validateWorkspace} from './domain.mjs';

// Validate before entering sandbox mode. An API error is never a workspace.
export async function loadTrainingWorkspace(path, fetcher = fetch) {
  const response = await fetcher(path, {cache: 'no-store'});
  if (!response.ok) throw new Error('Training data could not load (HTTP ' + response.status + '). Reload the page or contact the site owner.');
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    throw new Error('Training data is unavailable: the server returned a page instead of JSON. Contact the site owner.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Training data is invalid. Contact the site owner.'); }
  try { return validateWorkspace(data.workspace, [{id: 'sandbox', active: true}]); }
  catch { throw new Error('Training data is missing or invalid. Contact the site owner.'); }
}
