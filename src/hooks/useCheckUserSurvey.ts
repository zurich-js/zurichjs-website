import { useUser } from "@clerk/nextjs";

// Define the expected shape of survey data
interface SurveyData {
    role: string;
    company: string;
    interests: string[];
    experience: string;
    newsletter: boolean;
}



export const useCheckUserSurvey = () => {
    const { user } = useUser();

    const surveyData = user?.unsafeMetadata.surveyData as Partial<SurveyData>;


    const isValid = surveyData && Object.keys(surveyData).every(key => {
        const field = surveyData[key as keyof SurveyData];
        return field !== undefined && field !== null;
    });

    return {
        isValid,
        surveyData
    };
};