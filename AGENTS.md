# Rules for agents

## Responses

- Keep responses concise and to the point - unless the user asks otherwise by the user

## Planning mode
- Ask clarifying questions if ambiguity prevents from progressing
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## Changes / editing
- Delegate changes in code to sub-agents when possible.
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- always use sub-agents when possible. If so use them to implement features, act as a coordinator only.
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always check code quality using applicable project checks and report what couldn’t be run.

## Testing
- use any tools and libraries available to the project to test changes
- never assume your changes work, always test

# design
- always follow design details specified for this project
- design document @DESIGN.md
