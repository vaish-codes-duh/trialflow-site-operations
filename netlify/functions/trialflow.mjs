import {getStore} from '@netlify/blobs';
import {baseSnapshot} from '../../.netlify/trialflow/base-snapshot.mjs';
import {createNetlifyHandler} from '../../lib/netlify-pilot.mjs';

export default async function handler(request, context) {
  return createNetlifyHandler({getStore, baseSnapshot,
    ownerEmail: process.env.SITE_OWNER_EMAIL})(request, context);
}

export const config = {path: '/api/*'};
