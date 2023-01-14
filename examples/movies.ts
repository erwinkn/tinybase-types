
// Classical database demo, based on The Movie Database (TMDB)
// https://www.themoviedb.org

import { AllCellIds, createStore, OutputOf } from "tinybase/store";

// Let's try a type schema with optional fields

// TODO: if you use `interface` here, `Schema` won't 
// be considered as extending `ExternalSchema`, since
// it's based on `Record`. Is there a way to avoid that
// gotcha in the library types?
type Schema = {
	movies: {
		id: string;
		name: string;
		genreId: string;
		directorId: string;
		year: number;
		rating: number;
		overview?: string;
		image?: string;
	};
	genres: {
		id: string;
		name?: string | null;
	};
	people: {
		id: string;
		name: string;
		// Let's throw in a string union as well
		gender: "M" | "F" | "NB" | "O";
		born: number;
		died: boolean;
		popularity: number;
		biography?: string;
		image?: string;
	};
	// Pairs each movie to the top 3 actors within it
	cast: {
		id: string;
		movieId: string;
		castId: string;
	};
};

const store = createStore<Schema>();

type Data = OutputOf<typeof store>;
type Test = AllCellIds<Data>;

store.addCellListener("movies", "xxx", "year", (store, tableId, rowId, cellId, newCell, oldCell, getCellChange) => {

})
