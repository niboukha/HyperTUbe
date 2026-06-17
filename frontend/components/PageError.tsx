export default function PageError({ code = 404 }) {
  const errors = {
    404: { message: "Page not found" },
    403: { message: "Access forbidden" },
    401: { message: "Unauthorized" },
    500: { message: "Internal server error" },
    503: { message: "Service unavailable" },
    400: { message: "Bad request" },
  };

  const { message } = errors[code] || errors[404];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen flex-1 gap-2 md:gap-4">
    <span className="text-white/40 text-4xl">🎬</span>      
        
    <h1 className="text-white text-2xl md:text-4xl font-extrabold tracking-tight">{code}</h1>
      <div className="w-16 h-[2px] bg-[#BD0404]" />
      <p className="text-white/40 text-sm! md:text-lg! tracking-widest uppercase">{message}</p>
    </div>
  );
}