import type { NextApiRequest, NextApiResponse } from "next";


import { withTelemetry } from '@/lib/multiplayer';

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction


type Data = {
  name: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  res.status(200).json({ name: "John Doe" });
}

// Wrap with Multiplayer telemetry for full-stack observability
export default withTelemetry(handler, {
  spanName: 'hello-api',
  attributes: {
    'api.type': 'example',
  },
});
