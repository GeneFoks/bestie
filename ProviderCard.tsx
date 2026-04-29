@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  background: #080810;
  color: #E8E0FF;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

::placeholder {
  color: #9B93C0;
  opacity: 1;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #080810;
}

::-webkit-scrollbar-thumb {
  background: #1a1a30;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #D4AF37;
}

a {
  color: inherit;
  text-decoration: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
