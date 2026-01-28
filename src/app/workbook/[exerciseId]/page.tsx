/**
 * /workbook/[exerciseId] → /workbook#exerciseId redirect
 *
 * Single Page Architecture: All workbook content lives at /workbook.
 * Old exercise URLs redirect to hash navigation.
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ exerciseId: string }>;
}

export default async function WorkbookExercisePage({ params }: PageProps) { // code_id:160
  const { exerciseId } = await params;

  // Redirect to single workbook page with hash
  redirect(`/workbook#${exerciseId}`);
}
