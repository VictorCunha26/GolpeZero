const paths = {
  message: "M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3A7.5 7.5 0 1 1 20 11.5Z M9 10h7 M9 13h5",
  link: "M10 14l4-4 M8 16l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0 M16 8l1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0",
  image: "M4 4h16v16H4z M4 16l5-5 4 4 2-2 5 5 M15 8h.01",
  arrow: "M4 12h15 M13 6l6 6-6 6",
  lock: "M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M16 16l5 5",
  shield: "M12 2l8 4v6c0 4-4 8-8 10-4-2-8-6-8-10V6l8-4Z M9 12l2 2 4-4",
  sound: "M3 9h4l5-4v14l-5-4H3z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12",
  alert: "M12 3 2 20h20L12 3Z M12 9v4 M12 16h.01",
  upload: "M12 15V3 M7 8l5-5 5 5 M4 15v5h16v-5"
};

export default function Icon({ name, size = 22 }: { name: keyof typeof paths; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
