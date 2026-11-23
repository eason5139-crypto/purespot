import {SurveyPage} from "@/components/surveys/SurveyPage";
export default async function Page({params}:{params:Promise<{id:string}>}){return <SurveyPage id={(await params).id}/>;}
