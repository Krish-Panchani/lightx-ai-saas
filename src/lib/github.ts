import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from 'axios'
import { aiSummariseCommit } from "./gemini";
export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const githubUrl = 'https://github.com/Krish-Panchani/lightx-ai-saas'

type Response = {
    commitHash: string;
    commitMessage: string
    commitAuthorName: string
    commitAuthorAvatar: string
    commitDate: string
}

// This function will return the last 10 commits of the project with the given github url 
export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {

    const [owner, repo] = githubUrl.split('/').slice(-2)
    if (!owner || !repo) {
        throw new Error("Invalid github url");
    }
    const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo
    })
    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()) as any;
    
    
    return sortedCommits.slice(0, 10).map((commit: any) => ({
        commitHash: commit.sha as string,
        commitMessage: commit.commit.message ?? '',
        commitAuthorName: commit.commit?.author.name ?? '',
        commitAuthorAvatar: commit.author?.avatar_url ?? '',
        commitDate: commit.commit?.author.date ?? ''
    }))
}


// This function will return the unprocessed commits for the project with the given id 
export const pollCommits = async (projectId: string) => {
    const {project, githubUrl} = await fetchProjectGithubUrl(projectId)
    const commitHashes = await getCommitHashes(githubUrl)
    const unprosessedCommits = await filterUnprocessedCommits(projectId, commitHashes)
    const summaryResponses = await Promise.allSettled(unprosessedCommits.map(commit => {
        return summariseCommit(githubUrl, commit.commitHash)
    }))

    const summaries = summaryResponses.map((response) => {
        if(response.status === 'fulfilled') {
            return response.value as string
        }
        return "Error from AI while summarising commit"
    })

    const commit = await db.commit.createMany({
        data: summaries.map((summary, index) => {
            console.log(`Processing Commit ${index}`)
            return {
                projectId: projectId,
                commitHash: unprosessedCommits[index]!.commitHash,
                commitMessage: unprosessedCommits[index]!.commitMessage,
                commitAuthorName: unprosessedCommits[index]!.commitAuthorName,
                commitAuthorAvatar: unprosessedCommits[index]!.commitAuthorAvatar,
                commitDate: unprosessedCommits[index]!.commitDate,
                summary
            }
        })
    })
    return commit
}

// This function will return the summary of the commit with the given commit hash 
async function summariseCommit(githubUrl: string, commitHash: string) {
    //get the diff, then pass the diff into ai
    
    // console.log(`Summarising commit ${commitHash}`) 
    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: {
            Accept: 'application/vnd.github.v3.diff'
        }
    });
    console.log(data)
    return await aiSummariseCommit(data);

}

// This function will return the project and github url for the project with the given id  
async function fetchProjectGithubUrl(projectId: string) {
    const project = await db.project.findUnique({
        where: { id: projectId },
        select: { githubUrl: true }
    });

    if (!project?.githubUrl) {
        throw new Error("Project does not have a github url");
    }
    return {project, githubUrl: project?.githubUrl};
}

// This function will return the unprocessed commits for the project with the given id 
async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) {
    const processedCommits = await db.commit.findMany({
        where: { projectId }
    })
    const unprosessedCommits = commitHashes.filter((commit) => !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash))
    return unprosessedCommits
}

// pollCommits('cm5515fp90000mnicpn3febck').then(console.log) // This will return the unprocessed commits for the project with id 1