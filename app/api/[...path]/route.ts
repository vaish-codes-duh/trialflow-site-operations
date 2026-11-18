import { env } from 'cloudflare:workers';
import { handleApi } from '../../../lib/pilot-api.mjs';
export const GET=(request:Request)=>handleApi(request,env);
export const POST=(request:Request)=>handleApi(request,env);
export const PUT=(request:Request)=>handleApi(request,env);
export const DELETE=(request:Request)=>handleApi(request,env);
