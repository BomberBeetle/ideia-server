import { DocumentId } from "@automerge/automerge-repo";

export default class IdeaDoc{
    automerge_id: DocumentId
    document_id: String
    allowedUserIds: [String]
    owner: String
}