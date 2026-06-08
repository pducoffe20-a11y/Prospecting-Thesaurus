import { google } from 'googleapis';

export async function createSharedProspectingDoc(
  accessToken: string,
  title: string,
  content: string
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  try {
    // Create a new blank Google Document
    const fileMetadata = {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
    };

    const docFile = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id,webViewLink',
    });

    const fileId = docFile.data.id;
    if (!fileId) {
      throw new Error('Failed to retrieve newborn document ID from Drive API');
    }

    // Populate document content
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });

    return docFile.data.webViewLink || `https://docs.google.com/document/d/${fileId}/edit`;
  } catch (error) {
    console.error('Google Workspace docs creation failed:', error);
    throw error;
  }
}
