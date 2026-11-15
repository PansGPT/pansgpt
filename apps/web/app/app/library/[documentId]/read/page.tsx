import { ReaderWorkspace } from "@/components/reader/reader-workspace";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}): Promise<React.ReactElement> {
  const { documentId } = await params;
  return <ReaderWorkspace documentId={documentId} />;
}
