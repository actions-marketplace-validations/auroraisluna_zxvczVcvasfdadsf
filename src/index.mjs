//This tool is used to fetch the comments from a GitHub repository PR and check for the last comment. If the last comment is from a human then: 
//1. Check if the PR starts with "QA Report" or "Quality Assurance Tester Report" or "Quality Assurance Trainee Report"
//2. Check for the string after "Testing Results:", if its "Passed" then an action should be triggered (customizable) if its "Not Passed" then an action should be triggered
import 'dotenv/config'
import { Octokit } from "@octokit/rest";
import core from '@actions/core';

//Function to fetch the comments from a PR
async function fetchComments(owner, repo, issue_number) {

    const comments = await octokit.issues.listComments({
        owner: owner,
        repo: repo,
        issue_number: issue_number
    });

    return comments.data;
}

//Function to retrieve the last comment from the PR
async function getLastComment(owner, repo, issue_number) {

    const comments = await fetchComments(owner, repo, issue_number);

    return comments[comments.length - 1];

}

//Function to check if the comment contains the string "QA Report" or "Quality Assurance Tester Report" or "Quality Assurance Trainee Report"
function isQAcomment(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("QA Report") || commentBody.includes("Quality Assurance Tester Report") || commentBody.includes("Quality Assurance Trainee Report")) {
        return true;
    } else {
        return false;
    }

}

//Function to check if the comment contains the string "Testing Results"
function hasTestingResults(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("Testing Results")) {
        return true;
    } else {
        return false;
    }

}

//Function to check if the comment contains the string "Passed" after "Testing Results"
function isPassed(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("Not Passed") || commentBody.includes("Not passed") || commentBody.includes("not passed") || commentBody.includes("not Passed")) {
        return false;
    } else if (commentBody.includes("Passed") || commentBody.includes("passed")) {
        return true;
    }

}

try {

    const octokit = new Octokit({
        auth: core.getInput('github-token')
    });
  
    const repoOwner = core.getInput('repo-owner');
    const repoName = core.getInput('repo-name');
    const prNumber = core.getInput('pr-number');

    console.log(`Fetching comments from ${repoOwner}/${repoName} PR#${prNumber}`);

    const comment = await getLastComment(repoOwner, repoName, prNumber);

    if (!isQAcomment(comment)) return console.log(`Not a QA comment`);
    if (!hasTestingResults(comment)) return console.log(`No testing results found`);

    if (!isPassed(comment)) {
        console.log(`QA Reported as NOT PASSED`);
        core.setFailed(`QA Reported as NOT PASSED`);
        return;
    }

    //Now we can pass the action
    console.log(`QA Reported as PASSED`);
    core.setOutput("QA-Report", "PASSED");

    //Now we want to add a label to the PR
    const addLabel = await octokit.issues.addLabels({
        owner: repoOwner,
        repo: repoName,
        issue_number: prNumber,
        labels: [core.getInput('label-pass')]
    });

    console.log(`Label added to PR#${prNumber}`);

    return;

} catch (error) {
  core.setFailed(error.message);
}
