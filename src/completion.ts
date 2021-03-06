import { settings } from 'cluster';
import { Console } from 'console';
import { mainModule } from 'process';
import * as vscode from 'vscode';

import { Helpers } from './helpers';
import { Settings } from './settings';
//
// Logic to toggle a task completed
//
// Match completed flag, priority and completed date optionally along with rest
// of task. Because this regex is mad of all optional fields (leading space, completed flag,
// priority, completed date, creation date and rest of task line) it is guaranteed to
// match any line. (The leading space part, \s*, doesn't need the optional flag,
// ?, because it will match zero or more leading spaces. Thus even if there is
// no leading space, it will return the empty string.)
//
const TaskCompletionRegEx = /^(\s*)(x )?(\([A-Z]\) )?(\d{4}-\d{2}-\d{2} )?(\d{4}-\d{2}-\d{2} )?(.*)$/;

export namespace Completion {

    export function toggleCompletion() {
        const editor = vscode.window.activeTextEditor;
        let [startLine, endLine] = Helpers.getSelectedLineRange(false);
        for (var i = startLine; i <= endLine; i++) {
            let text = editor.document.lineAt(i).text;
            var lead, completed, priority, completionDate, creationDate, task, _t, newTask;
            [_t, lead, completed, priority, completionDate, creationDate, task] = text.match(TaskCompletionRegEx);
            // regex with one date will match the completionDate first regardless so need to fix that here
            if (!completed && completionDate && !creationDate) {
                creationDate = completionDate;
                completionDate = undefined;
            }
            if (completed) {
                // toggle back to incomplete by leaving off the completed flag and date fields
                newTask = lead + (priority || "") + (creationDate || "") + task;
            } else {
                // toggle to completed by adding in the completed flag and date fields

                var dateObj = new Date();
                var month = dateObj.getUTCMonth() + 1; //months from 1-12
                var monthString = month < 10 ? "0" + month : month;
                var day = dateObj.getUTCDate();
                var dayString = day < 10 ? "0" + day : day;
                let today = monthString.toString() + dayString.toString();
                if (Settings.RemovePriorityFromCompletedTasks) {
                    // NOTE if I wanted to preserve the priority like they suggest in the spec,
                    // I could do this, but don't love it
                    // if (priority) {
                    //     task += " pri:" + priority[1];
                    // }
                    priority = "";
                }
                let updatedTask = task.replace(/- /g, '');
                let prefix = updatedTask.match('DD:') ? ',' : ' DD:';
                newTask = lead + Settings.CompletedTaskPrefix + (priority || "") + (creationDate || "") + updatedTask + prefix + today;
            }
            // replace the old line with the new, toggled line
            editor.edit(builder => {
                builder.replace(
                    new vscode.Range(
                        new vscode.Position(i, 0),
                        new vscode.Position(i, text.length)),
                    newTask);
            });
        }
        Helpers.triggerSelectionChange();
    }
}
