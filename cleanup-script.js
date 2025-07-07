const fs = require('fs');
const path = require('path');

// Cleanup script for Goggins Motivational Chatbot
console.log('🧹 Starting project cleanup...');

const cleanupTasks = {
    // Remove duplicate logger definitions
    removeLogger: () => {
        console.log('📝 Cleaning up duplicate logger definitions...');
        
        // Voice-chat.js has its own logger that should use the centralized one
        const voiceChatPath = './voice-chat.js';
        if (fs.existsSync(voiceChatPath)) {
            let content = fs.readFileSync(voiceChatPath, 'utf8');
            
            // Remove duplicate logger definition
            const loggerRegex = /\/\/ Simple logger for browser\s*\nconst logger = \{[\s\S]*?\};/;
            if (loggerRegex.test(content)) {
                content = content.replace(loggerRegex, '// Logger will be available globally');
                fs.writeFileSync(voiceChatPath, content);
                console.log('✅ Removed duplicate logger from voice-chat.js');
            }
        }
        
        // Auth.js has duplicate logger
        const authPath = './auth.js';
        if (fs.existsSync(authPath)) {
            let content = fs.readFileSync(authPath, 'utf8');
            
            const loggerRegex = /\/\/ Simple logger for browser\s*\nconst logger = \{[\s\S]*?\};/;
            if (loggerRegex.test(content)) {
                content = content.replace(loggerRegex, '// Logger will be available globally');
                fs.writeFileSync(authPath, content);
                console.log('✅ Removed duplicate logger from auth.js');
            }
        }
    },

    // Remove excessive debug statements
    removeExcessiveDebug: () => {
        console.log('🔍 Removing excessive debug statements...');
        
        const filesToClean = ['./app.js', './voice-chat.js', './auth.js'];
        
        filesToClean.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Remove empty debug statements
                content = content.replace(/\s*logger\.debug\(\s*['""]['""],?\s*.*?\);\s*/g, '');
                content = content.replace(/\s*console\.log\(\s*['""]['""],?\s*.*?\);\s*/g, '');
                
                // Remove redundant debug statements
                const lines = content.split('\n');
                const filteredLines = [];
                let lastDebugLine = '';
                
                lines.forEach(line => {
                    const isDebugLine = line.trim().startsWith('logger.debug') || line.trim().startsWith('console.log');
                    
                    if (isDebugLine) {
                        // Only keep if different from last debug line
                        if (line.trim() !== lastDebugLine.trim()) {
                            filteredLines.push(line);
                            lastDebugLine = line;
                        }
                    } else {
                        filteredLines.push(line);
                        lastDebugLine = '';
                    }
                });
                
                fs.writeFileSync(filePath, filteredLines.join('\n'));
                console.log(`✅ Cleaned debug statements in ${path.basename(filePath)}`);
            }
        });
    },

    // Clean up CSS redundancies
    cleanCSS: () => {
        console.log('🎨 Cleaning up CSS redundancies...');
        
        const cssPath = './styles.css';
        if (fs.existsSync(cssPath)) {
            let content = fs.readFileSync(cssPath, 'utf8');
            
            // Remove duplicate CSS rules (simple pattern matching)
            const lines = content.split('\n');
            const seen = new Set();
            const uniqueLines = [];
            
            lines.forEach(line => {
                const trimmed = line.trim();
                
                // Skip if it's a duplicate CSS property line (simple check)
                if (trimmed.includes(':') && trimmed.endsWith(';')) {
                    if (!seen.has(trimmed)) {
                        seen.add(trimmed);
                        uniqueLines.push(line);
                    }
                } else {
                    uniqueLines.push(line);
                }
            });
            
            fs.writeFileSync(cssPath, uniqueLines.join('\n'));
            console.log('✅ Cleaned CSS redundancies');
        }
    },

    // Remove unused constants
    cleanConstants: () => {
        console.log('📋 Checking for unused constants...');
        
        const constantsPath = './utils/constants.js';
        if (fs.existsSync(constantsPath)) {
            let content = fs.readFileSync(constantsPath, 'utf8');
            
            // Find all files that use constants
            const allFiles = [
                './server.js', './app.js', './voice-chat.js', 
                './models/User.js', './services/DatabaseService.js'
            ];
            
            let allUsages = '';
            allFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    allUsages += fs.readFileSync(file, 'utf8');
                }
            });
            
            // Check which constants are actually used
            const constantChecks = [
                'VOICE_TYPES',
                'INTENSITY_LEVELS', 
                'MESSAGE_TYPES',
                'DEFAULT_SETTINGS',
                'MOOD_PHRASES'
            ];
            
            const unusedConstants = constantChecks.filter(constant => 
                !allUsages.includes(constant)
            );
            
            if (unusedConstants.length > 0) {
                console.log(`⚠️  Found potentially unused constants: ${unusedConstants.join(', ')}`);
            } else {
                console.log('✅ All constants appear to be in use');
            }
        }
    },

    // Remove commented code and TODOs
    removeCommentedCode: () => {
        console.log('💬 Cleaning up commented code...');
        
        const filesToClean = [
            './app.js', './server.js', './voice-chat.js', 
            './auth.js', './services/DatabaseService.js'
        ];
        
        filesToClean.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Remove single-line commented code (but keep documentation comments)
                const lines = content.split('\n');
                const cleanedLines = lines.filter(line => {
                    const trimmed = line.trim();
                    
                    // Keep documentation comments and function headers
                    if (trimmed.startsWith('//') && (
                        trimmed.includes('TODO') ||
                        trimmed.includes('FIXME') ||
                        trimmed.includes('DEBUG') ||
                        trimmed.includes('console.log') ||
                        trimmed.includes('logger.debug')
                    )) {
                        return false; // Remove these
                    }
                    
                    return true; // Keep everything else
                });
                
                fs.writeFileSync(filePath, cleanedLines.join('\n'));
                console.log(`✅ Cleaned commented code in ${path.basename(filePath)}`);
            }
        });
    },

    // Consolidate repetitive error handling
    consolidateErrorHandling: () => {
        console.log('🚨 Consolidating error handling patterns...');
        
        const serverPath = './server.js';
        if (fs.existsSync(serverPath)) {
            let content = fs.readFileSync(serverPath, 'utf8');
            
            // Replace repetitive try-catch blocks with error handler
            const repetitiveCatch = /} catch \(error\) \{\s*errorHandler\.handleAPIError\(res, error, ['"](.*?)['"], (\d+)?\);\s*}/g;
            
            let matches = content.match(repetitiveCatch);
            if (matches && matches.length > 3) {
                console.log(`✅ Found ${matches.length} similar error handling patterns - consider using middleware`);
            }
        }
    },

    // Remove empty functions and unused imports
    removeUnusedCode: () => {
        console.log('🗑️  Checking for unused imports and empty functions...');
        
        const filesToCheck = ['./app.js', './server.js', './voice-chat.js'];
        
        filesToCheck.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Check for empty functions
                const emptyFunctionRegex = /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g;
                const emptyFunctions = content.match(emptyFunctionRegex);
                
                if (emptyFunctions) {
                    console.log(`⚠️  Found ${emptyFunctions.length} empty functions in ${path.basename(filePath)}`);
                }
                
                // Check for unused requires (simple check)
                const requireRegex = /const\s+(\w+)\s*=\s*require\([^)]+\);/g;
                let match;
                const requires = [];
                
                while ((match = requireRegex.exec(content)) !== null) {
                    requires.push(match[1]);
                }
                
                const unusedRequires = requires.filter(req => {
                    const usageRegex = new RegExp(`\\b${req}\\b`, 'g');
                    const matches = content.match(usageRegex) || [];
                    return matches.length <= 1; // Only the require statement itself
                });
                
                if (unusedRequires.length > 0) {
                    console.log(`⚠️  Potentially unused requires in ${path.basename(filePath)}: ${unusedRequires.join(', ')}`);
                }
            }
        });
    }
};

// Run all cleanup tasks
const runCleanup = async () => {
    try {
        // Create backup
        console.log('💾 Creating backup of original files...');
        const backupDir = './backup_' + Date.now();
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const filesToBackup = [
            './app.js', './server.js', './voice-chat.js', 
            './auth.js', './styles.css', './utils/constants.js'
        ];
        
        filesToBackup.forEach(file => {
            if (fs.existsSync(file)) {
                const filename = path.basename(file);
                fs.copyFileSync(file, path.join(backupDir, filename));
            }
        });
        
        console.log(`✅ Backup created in ${backupDir}/`);
        
        // Run cleanup tasks
        Object.values(cleanupTasks).forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('❌ Error in cleanup task:', error.message);
            }
        });
        
        console.log('\n🎉 Cleanup completed! Summary:');
        console.log('- Removed duplicate logger definitions');
        console.log('- Cleaned excessive debug statements');
        console.log('- Removed CSS redundancies');
        console.log('- Checked for unused constants');
        console.log('- Cleaned commented code');
        console.log('- Analyzed error handling patterns');
        console.log('- Checked for unused imports');
        
        console.log('\n📝 Next steps:');
        console.log('1. Test your application to ensure everything works');
        console.log('2. Review the console warnings for manual cleanup');
        console.log('3. Consider implementing suggested improvements');
        console.log('4. Remove backup folder when satisfied with changes');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
};

// Export for use as a module or run directly
if (require.main === module) {
    runCleanup();
}

module.exports = { cleanupTasks, runCleanup };