export const tabs = [
  {
    key: 'settings',
    label: '설정',
    path: '/settings',
    icon: (
      <svg data-slot="icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    key: 'archive',
    label: '보관함',
    path: '/trash',
    icon: (
      <svg data-slot="icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    key: 'camera',
    label: 'Camera',
    path: '/camera',
    icon: (
      <svg data-slot="icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    key: 'home',
    label: '홈',
    path: '/',
    icon: (
      <svg data-slot="icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: '마이페이지',
    path: '/profile',
    icon: (
      <svg data-slot="icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
]

export const homeActions = [
  {
    title: '사진 편집',
    path: '/photo-editor',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12.2 3.6 1.5 4.4 4.6-1.1-2.1 4.3 4 2.5-4.7.9.4 4.7-3.7-3-3.7 3 .4-4.7-4.7-.9 4-2.5-2.1-4.3 4.6 1.1 1.5-4.4Z" />
      </svg>
    ),
  },
  {
    title: '동영상 편집',
    path: '/video-editor',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8.75 3.25 10 6.5h4l-1.25-3.25h2.5L16.5 6.5H18A3.5 3.5 0 0 1 21.5 10v7A3.5 3.5 0 0 1 18 20.5H6A3.5 3.5 0 0 1 2.5 17v-7A3.5 3.5 0 0 1 6 6.5h1.5L6.25 3.25h2.5Zm2.1 7.9a.9.9 0 0 0-1.35.78v4.14a.9.9 0 0 0 1.35.78l3.58-2.07a.9.9 0 0 0 0-1.56l-3.58-2.07Z" />
      </svg>
    ),
  },
  {
    title: '카메라 모드',
    path: '/camera',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.2 4.5h5.6l1.3 2.2H19A3.5 3.5 0 0 1 22.5 10v6.5A3.5 3.5 0 0 1 19 20H5a3.5 3.5 0 0 1-3.5-3.5V10A3.5 3.5 0 0 1 5 6.7h2.9l1.3-2.2Zm2.8 13a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0-2.4a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z" />
      </svg>
    ),
  },
]
