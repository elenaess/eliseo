export type MockServer = {
  id: string;
  name: string;
  members: number;
  accent: string;
};

export type MockPost = {
  id: string;
  name: string;
  handle: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  accent: string;
};

export type MockDm = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  accent: string;
};

export const servers: MockServer[] = [
  {id: 'rizoma', name: 'Rizoma', members: 124, accent: '#7357FF'},
  {id: 'quimica', name: 'Química', members: 82, accent: '#42A9FF'},
  {id: 'jogos', name: 'Jogos', members: 219, accent: '#48CDC9'},
  {id: 'amigos', name: 'Amigos', members: 31, accent: '#EF7A9B'},
];

export const posts: MockPost[] = [
  {
    id: 'p1',
    name: 'Luna',
    handle: '@luna',
    time: 'agora',
    text: 'Terminei mais uma parte do projeto. O Elíseo está ficando lindo demais.',
    likes: 128,
    comments: 18,
    accent: '#7357FF',
  },
  {
    id: 'p2',
    name: 'Mari',
    handle: '@mari',
    time: '12 min',
    text: 'Amo quando a comunidade inteira começa a discutir uma ideia e a conversa vai longe.',
    likes: 76,
    comments: 9,
    accent: '#42A9FF',
  },
  {
    id: 'p3',
    name: 'Gabe',
    handle: '@gabe',
    time: '35 min',
    text: 'Hoje é dia de organizar os arquivos, terminar o relatório e depois call.',
    likes: 54,
    comments: 6,
    accent: '#48CDC9',
  },
];

export const dms: MockDm[] = [
  {
    id: 'luna',
    name: 'Luna',
    preview: 'te mando o arquivo daqui a pouco',
    time: '20:14',
    unread: 2,
    accent: '#7357FF',
  },
  {
    id: 'mari',
    name: 'Mari',
    preview: 'a call foi boa demais kkkkk',
    time: '19:48',
    accent: '#42A9FF',
  },
  {
    id: 'gabe',
    name: 'Gabe',
    preview: 'beleza, fechado então',
    time: '18:31',
    accent: '#48CDC9',
  },
];

export const folders = [
  {id: 'folder-1', name: 'Pasta 1', items: 12, accent: '#42A9FF'},
  {id: 'folder-2', name: 'Pasta 2', items: 28, accent: '#7357FF'},
  {id: 'folder-3', name: 'Pasta 3', items: 9, accent: '#48CDC9'},
];

export const files = [
  {id: 'f1', name: 'Relatório.pdf', type: 'PDF', size: '2,8 MB'},
  {id: 'f2', name: 'Resultados.xlsx', type: 'Planilha', size: '812 KB'},
  {id: 'f3', name: 'Imagem.png', type: 'Imagem', size: '1,4 MB'},
];

export const channels = [
  {id: 'geral', name: 'geral'},
  {id: 'projetos', name: 'projetos'},
  {id: 'off-topic', name: 'off-topic'},
];
