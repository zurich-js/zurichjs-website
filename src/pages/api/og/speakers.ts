import type { APIContext } from 'astro';
import { GET as handler } from '@/lib/og/speakers';

export const prerender = false;

export const GET = handler;
