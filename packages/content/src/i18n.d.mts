export interface Catalog {schemaVersion:string;sourceLocale:string;locales:Record<string,string>;entries:Record<string,Record<string,unknown>>}
export function validateCatalog(catalog:Catalog,options?:{authorityIds?:string[]|null}):string[];
export function translate(catalog:Catalog,locale:string,key:string,params?:Record<string,string|number>):{readonly text:string;readonly locale:string;readonly official:boolean;readonly fallback:boolean;readonly label:string|null;readonly sourceId?:string};
export function plainLanguageReport(text:string):{readonly averageSentenceWords:number;readonly longWordShare:number;readonly plain:boolean};
