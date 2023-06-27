//This tool is used to fetch the comments from a GitHub repository PR and check for the last comment. If the last comment is from a human then: 
//1. Check if the PR starts with "QA Report" or "Quality Assurance Tester Report" or "Quality Assurance Trainee Report"
//2. Check for the string after "Testing Results:", if its "Passed" then an action should be triggered (customizable) if its "Not Passed" then an action should be triggered
import 'dotenv/config'
import { Octokit } from "@octokit/rest";
import core from '@actions/core';

//Function to fetch the comments from a PR
async function fetchComments(octo, owner, repo, issue_number) {

    try {

        const comments = await octo.issues.listComments({
            owner: owner,
            repo: repo,
            issue_number: issue_number
        });

        return comments.data;

    } catch (error) {

        core.setFailed(error);
        throw new Error(error);

    };

};

//Function to retrieve the last comment from the PR
async function getLastComment(octo, owner, repo, issue_number) {

    try {

        const comments = await fetchComments(octo, owner, repo, issue_number);

        return comments[comments.length - 1];

    } catch (error) {

        core.setFailed(error);
        throw new Error(error);

    };

};

//Function to check if the comment contains the straing "Ready to Test", "Ready for Testing", "Ready for QA", "Ready for Quality Assurance", "Ready for Quality Assurance Testing", "RTT"
function isRTTComment(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("Ready to Test") || commentBody.includes("Ready for Testing") || commentBody.includes("Ready for QA") || commentBody.includes("Ready for Quality Assurance") || commentBody.includes("Ready for Quality Assurance Testing") || commentBody.includes("RTT")) {
        return true;
    } else {
        return false;
    };

};

//Function to check if the comment contains the string "QA Report" or "Quality Assurance Tester Report" or "Quality Assurance Trainee Report"
function isQAcomment(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("QA Report") || commentBody.includes("Quality Assurance Tester Report") || commentBody.includes("Quality Assurance Trainee Report")) {
        return true;
    } else {
        return false;
    };

};

//Function to check if the comment contains the string "Testing Results"
function hasTestingResults(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("Testing Results")) {
        return true;
    } else {
        return false;
    };

};

//Function to check if the comment contains the string "Passed" after "Testing Results"
function isPassed(comment) {

    const commentBody = comment.body;

    if (commentBody.includes("Not Passed") || commentBody.includes("Not passed") || commentBody.includes("not passed") || commentBody.includes("not Passed")) {
        return false;
    } else if (commentBody.includes("Passed") || commentBody.includes("passed")) {
        return true;
    };

};

//Main 'function'
try {

    //Variable so we can check if the comment is either QA or RTT and if not then we can fail the action
    let isValidComment = false;

    //Get variables from the workflow
    const token = core.getInput('github-token');
    const repoOwner = core.getInput('repo-owner');
    const repoName = core.getInput('repo-name');
    const prNumber = core.getInput('pr-number');
    const labelPass = core.getInput('label-pass');
    const labelFail = core.getInput('label-fail');
    const labelRTT = core.getInput('label-rtt');

    console.log(`Starting QA Report Action V0.9`);

    //Create an Octokit instance and authenticate 
    const octokit = new Octokit({
        auth: token
    });
  
    console.log(`Fetching comments from ${repoOwner}/${repoName} PR#${prNumber}`);

    //Get the last comment from the PR
    const comment = await getLastComment(octokit, repoOwner, repoName, prNumber);

    console.log(`Last comment by ${comment.user.login}`);

    //Check if the comment is either QA or RTT
    if (isQAcomment(comment)) isValidComment = true; //Set the isValidComment to true so we can pass the action

    if (isRTTComment(comment)) {

        isValidComment = true; //Set the isValidComment to true so we can pass the action
        core.setOutput("QA-Report", "RTT"); 

        //Now we want to add a label to the PR if we have the label-rtt input
        if (labelRTT) {

            await octokit.issues.addLabels({
                owner: repoOwner,
                repo: repoName,
                issue_number: prNumber,
                labels: [labelRTT]
            });

            console.log(`RTT label added to PR#${prNumber}`);
            console.log(`Action completed successfully`);

            //Lock
            isValidComment = false;

        };

    };

    //Check if the comment is either QA or RTT and if not then we can fail the action
    if (!isValidComment) core.setFailed(`Not a QA comment`);

    //Comment is not RTT so we can check if it is QA
    if (!hasTestingResults(comment) && isValidComment) {

        core.setFailed(`No testing results found`);
     
    //Comment is QA so we can check if it has testing results (if nots RTT'ed)
    } else if (hasTestingResults(comment) && isValidComment) {

        //Check if the comment has passed or not
        if (!isPassed(comment)) {

            //Now we can fail the action
            console.log(`QA Reported as NOT PASSED`);
            core.setFailed(`QA Reported as NOT PASSED`);

            //Now we want to add a label to the PR if we have the label-fail input
            if (labelFail) {

                await octokit.issues.addLabels({
                    owner: repoOwner,
                    repo: repoName,
                    issue_number: prNumber,
                    labels: [labelFail]
                });

                console.log(`Fail label added to PR#${prNumber}`);
                console.log(`Action completed successfully`);

            };

        //Comment has passed
        } else {

            //Now we can pass the action
            console.log(`QA Reported as PASSED`);
            core.setOutput("QA-Report", "PASSED");

            //Now we want to add a label to the PR if we have the label-pass input
            if (labelPass) {

                //Now we want to add a label to the PR if we have the label-pass input
                await octokit.issues.addLabels({
                    owner: repoOwner,
                    repo: repoName,
                    issue_number: prNumber,
                    labels: [labelPass]
                });

                console.log(`Pass label added to PR#${prNumber}`);
                console.log(`Action completed successfully`);

            };

        };

    };

//Catch any errors during the action and fail the action
} catch (error) {

  core.setFailed(error.message);

};
