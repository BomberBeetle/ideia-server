import { DocumentId } from "@automerge/automerge-repo";

export default class IdeaDoc{
    document_id: DocumentId
    allowedUserIds: [String]
    owner: String
}