export type RootStackParamList = {
  Login: undefined;

  Main: undefined;

  Server: {
    serverId: string;
  };

  Chat: {
    conversationId: string;
    name: string;
    otherUid?: string;
    serverId?: string;
    channelId?: string;
  };

  Call: {
    roomId?: string;
    title?: string;

    contextType?:
      | 'dm'
      | 'server';

    conversationId?: string;
    serverId?: string;
    channelId?: string;

    startWithVideo?: boolean;
  };

  Finance: undefined;

  Appearance: undefined;

  Notifications: undefined;

  Settings: undefined;
};

export type MainTabParamList = {
  Feed: undefined;

  Communities: undefined;

  Messages: undefined;

  Drive: undefined;

  Profile: undefined;
};