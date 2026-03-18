import type { APIContext } from 'astro';
import { GET as handler } from '@/lib/og/workshop';

export const prerender = false;

export const GET = handler;
