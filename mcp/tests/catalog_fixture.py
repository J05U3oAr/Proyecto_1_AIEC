from sofia.models import Movie, MovieId, SearchMovies, ToolResult


class FixtureCatalog:
    async def search(self, args: SearchMovies) -> ToolResult:
        return await self.details(MovieId(movieId=438631))

    async def details(self, args: MovieId) -> ToolResult:
        return ToolResult(
            movies=[
                Movie(
                    id=438631,
                    title="Dune",
                    tmdb="https://www.themoviedb.org/movie/438631",
                    poster="https://image.tmdb.org/t/p/w500/dune.jpg",
                    imdb="https://www.imdb.com/title/tt1160419/",
                )
            ]
        )
