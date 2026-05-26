export interface Photo {
  id: string;
  eventId?: string;
  childProfileId?: string;
  filePath: string;
  remoteUrl?: string;
  fileSize: number;
  width: number;
  height: number;
  createdAt: Date;
}
