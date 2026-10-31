import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({ redirect: { destination: '/policies/code-of-conduct', permanent: false } });
export default function PoliciesIndex() {
  return null;
}
