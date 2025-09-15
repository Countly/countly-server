# Contributing to Countly MCP Server

We welcome contributions to the Countly MCP Server project! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch from `main`
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

1. **Prerequisites**
   - Node.js 18+
   - npm or yarn
   - Access to a Countly server for testing

2. **Local Development**
   ```bash
   git clone https://github.com/your-username/countly-mcp-server.git
   cd countly-mcp-server
   npm install
   cp .env.example .env
   # Edit .env with your Countly server details
   npm run build
   npm run dev  # Start in watch mode
   ```

3. **Testing**
   ```bash
   npm test              # Run validation tests
   npm run test:tools    # Test MCP tools
   ```

## Code Guidelines

### TypeScript Standards
- Use TypeScript for all new code
- Follow existing code style and patterns
- Add type definitions for new interfaces
- Document complex functions with JSDoc comments

### Code Structure
- Keep functions focused and single-purpose
- Use descriptive variable and function names
- Handle errors gracefully with proper error messages
- Add appropriate logging for debugging

### Testing
- Add tests for new functionality
- Ensure existing tests pass
- Test both success and error cases
- Include integration tests for new tools

## Submitting Changes

### Pull Request Process
1. Create a descriptive branch name (`feature/add-new-tool`, `fix/error-handling`)
2. Make focused commits with clear messages
3. Update documentation if needed
4. Ensure all tests pass
5. Submit a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots if UI changes
   - Test results

### Commit Messages
Use clear, concise commit messages:
- `feat: add new analytics tool for user retention`
- `fix: handle undefined app_name in query functions`
- `docs: update API reference for new parameters`
- `test: add integration test for app management`

## Types of Contributions

### Bug Fixes
- Fix reported issues
- Add regression tests
- Update documentation if needed

### New Features
- Add new MCP tools
- Enhance existing functionality
- Improve error handling
- Add configuration options

### Documentation
- Fix typos and unclear sections
- Add examples and tutorials
- Update API reference
- Improve setup instructions

### Performance
- Optimize API calls
- Improve response times
- Reduce memory usage
- Add caching where appropriate

## Code Review Process

1. All submissions require review
2. Maintainers will review within 1-2 weeks
3. Address feedback promptly
4. Be open to suggestions and changes
5. Maintain a positive, collaborative tone

## Reporting Issues

### Bug Reports
Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS)
- Error messages and logs
- Minimal reproduction case

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Proposed implementation approach
- Examples of similar features

## Getting Help

- Check existing issues and documentation first
- Ask questions in GitHub Discussions
- Join community channels if available
- Be respectful and patient

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Countly MCP Server! 🚀
