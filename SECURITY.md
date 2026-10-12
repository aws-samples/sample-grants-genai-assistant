<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Security Policy

## Reporting a vulnerability

If you discover a potential security issue in this project, please notify AWS/Amazon
Security via the
[vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/)
or email aws-security@amazon.com.

**Please do not create a public GitHub issue.**

This matches the guidance in [CONTRIBUTING.md](CONTRIBUTING.md#security-issue-notifications).

## Scope

This repository is sample code for non-production usage, as stated at the top of the
[README](README.md). It is not an AWS service and carries no SLA. Reports are
nonetheless welcome and are triaged through the process above.

Deployments are created and operated entirely by whoever deploys the template, in
their own AWS account. There is no AWS-operated instance of this application.

## How fixes are published

Fixes land on the `main` branch. Because a deployment is a copy of this code running
in your account, **a deployed instance does not pick up a fix until you redeploy it.**

Security fixes are communicated in two places:

1. A notice at the top of the [README](README.md) when action is required by anyone
   who has already deployed
2. A git tag on the fixing commit, so you can identify what your deployment is based on

Before this policy was added, the repository carried no tags, so instances deployed
earlier cannot be identified by version. If you are unsure what your deployment is
based on, compare the commit you deployed from against `main`, or redeploy from the
current `main`.

## If you have already deployed

Check the README for any active security notice. Where one applies, the remediation is
to redeploy from the current `main` following
[Updating the Stack](install_docs/maintenance/UPDATING.md).

Deploying from a fork or an older clone means you will not receive fixes. Pull from
upstream before redeploying.
