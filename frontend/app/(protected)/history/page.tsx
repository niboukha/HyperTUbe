import HistoryCard from "@/components/history/HistoryCard";
import HeaderTitle from "@/components/ui/header-title";
 
// const historyData = [
//   {
//     id: 1,
//     title: "Avengers: Endgame",
//     overview: "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos' actions and restore balance to the universeInfinity War, the Avengers assemble once more to reverse Thanos actions and restore balance to the universe.",
//     backdrop_path: "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
//     genres: ["Action", "Sci-Fi"],
//     release_date: "2019-04-26",
//     vote_average: 8.4,
//     progress: 65,
//     runtimeLeft: "2h 19m",
//   },
//   {
//     id: 2,
//     title: "Interstellar",
//     overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
//     backdrop_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
//     genres: ["Drama", "Sci-Fi"],
//     release_date: "2014-11-07",
//     vote_average: 8.7,
//     progress: 30,
//     runtimeLeft: "2h 06m",
//   },
//   {
//     id: 3,
//     title: "The Dark Knight",
//     overview: "When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
//     backdrop_path: "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
//     genres: ["Action", "Crime"],
//     release_date: "2008-07-18",
//     vote_average: 9.0,
//     progress: 80,
//     runtimeLeft: "0h 30m",
//   },
//   {
//     id: 4,
//     title: "Inception",
//     overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
//     backdrop_path: "/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg",
//     genres: ["Action", "Thriller"],
//     release_date: "2010-07-16",
//     vote_average: 8.8,
//     progress: 10,
//     runtimeLeft: "2h 08m",
//   },
// ];

const historyData = [
  {
    group: "Today",
    items: [
      {
        id: 1,
        title: "Avengers: Endgame",
        overview: "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos' actions and restore balance to the universe.",
        backdrop_path: "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
        genres: ["Action", "Sci-Fi"],
        release_date: "2019-04-26",
        vote_average: 8.4,
        progress: 65,
        runtimeLeft: "2h 19m",
      },
      {
        id: 2,
        title: "Interstellar",
        overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        backdrop_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        genres: ["Drama", "Sci-Fi"],
        release_date: "2014-11-07",
        vote_average: 8.7,
        progress: 30,
        runtimeLeft: "2h 06m",
      },
    ],
  },
  {
    group: "Yesterday",
    items: [
      {
        id: 3,
        title: "The Dark Knight",
        overview: "When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        backdrop_path: "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
        genres: ["Action", "Crime"],
        release_date: "2008-07-18",
        vote_average: 9.0,
        progress: 80,
        runtimeLeft: "0h 30m",
      },
    ],
  },
  {
    group: "Last 7 Days",
    items: [
      {
        id: 4,
        title: "Inception",
        overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        backdrop_path: "/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg",
        genres: ["Action", "Thriller"],
        release_date: "2010-07-16",
        vote_average: 8.8,
        progress: 10,
        runtimeLeft: "2h 08m",
      },
      {
        id: 5,
        title: "The Matrix",
        overview: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        backdrop_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        genres: ["Action", "Sci-Fi"],
        release_date: "1999-03-31",
        vote_average: 8.7,
        progress: 100,
        runtimeLeft: "0h 00m",
      },
    ],
  },
  {
    group: "Last 30 Days",
    items: [
      {
        id: 6,
        title: "Oppenheimer",
        overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
        backdrop_path: "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
        genres: ["Drama", "History"],
        release_date: "2023-07-21",
        vote_average: 8.9,
        progress: 50,
        runtimeLeft: "1h 30m",
      },
    ],
  },
];

export default function History()
{
  return(
      <div className="relative flex flex-col  items-center !px-4 lg:!px-16 !space-y-4 !mt-15 !mb-15   bg-[#0E0E10] min-h-screen">
          {historyData.map((group) => (
            <div key={group.group} className="flex flex-col gap-3">
              
              {/* Group title */}
              <div className="!px-4">
                <HeaderTitle title={group.group} />
              </div>

              {/* Cards */}
              <div className="flex flex-col justify-center items-center w-full gap-2 !px-4">
                {group.items.map((item) => (
                  <HistoryCard key={item.id} {...item} />
                ))}
              </div>

            </div>
        ))}
      </div>
  )
}
