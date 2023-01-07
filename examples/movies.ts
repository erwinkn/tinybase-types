import { createStore, ExternalSchema } from "tinybase/store";
import { createQueryBuilder } from "../src/extensions/createQueryBuilder";

// Classical database demo, based on The Movie Database (TMDB)
// https://www.themoviedb.org

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
		name: string;
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

interface Foo {
  x: number;
  y: string;
}

type Base = {
  [key: string]: string | number | boolean
}

type Test = Foo extends Base ? true : false;

const store = createStore<Schema>();

store.setRow("people", "rowId", {
  id: "id",
  name: "name",
  gender: "M",
  born: 1983,
  died: false,
  popularity: 23
})
