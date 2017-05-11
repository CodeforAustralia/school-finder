
# Git Tricks for clean branches and easily reviewable pull requests

To make Pull Requests easy to review, the branch you're requesting to be merged should have just the commits related to the issue you're addressing. To clean your branch before submitting a PR, here are three ways to do it.

## Option 1: Always start from master and only work on one issue per branch.
In this example, we create two branches off `master`:
one called `fixes/97-bottles-of-beer-on-the-wall` and the other
called `fixes/100-too-much-beer`.

```
git checkout master #go to master to start new branch
git checkout -b fixes/97-bottles-of-beer-on-the-wall
git add beer1.txt beer2.txt; git commit

git checkout master #starting at master again
git checkout -b fixes/100-too-much-beer
git rm fosters.txt chang.txt coors.txt; git commit
```

## Option 2: Use git rebase to clean up a commit

```
git checkout master #go to master to start new branch
git checkout -b fixes/97-bottles-of-beer-on-the-wall
git add beer1.txt beer2.txt; git commit
git rm fosters.txt chang.txt coors.txt; git commit
# oh right we need a new branch with just removing beer, not adding, so create branch and rebase:

git checkout -b fixes/100-too-much-beer
git rebase -i master #rewrite history between master and this new branch
# rebase opens text editor that looks like this:

pick 20f103c added beer1, beer2
pick fb9a7cd removed chang, coors, fosters

# Rebase 8fba39d..fb9a7cd onto 8fba39d (2 command(s))
#
# Commands:
# p, pick = use commit
# r, reword = use commit, but edit the commit message
# e, edit = use commit, but stop for amending
# s, squash = use commit, but meld into previous commit
# f, fixup = like "squash", but discard this commit's log message
# x, exec = run command (the rest of the line) using shell
# d, drop = remove commit
#
# These lines can be re-ordered; they are executed from top to bottom.
#
# If you remove a line here THAT COMMIT WILL BE LOST.
#
# However, if you remove everything, the rebase will be aborted.
#
# Note that empty commits are commented out


since this branch is all about removing beer, we remove the commit that added beer (just change "pick" to "drop" on first line:

drop 20f103c added beer1, beer2
pick fb9a7cd removed chang, coors, fosters

# Rebase 8fba39d..fb9a7cd onto 8fba39d (2 command(s))
#
# Commands:
...

# save the file. Rebase will remove the commit we're dropping, so `git log` will show that the only new commit is removing beer. 
```

## Option 3: Use git cherry-pick to copy a commit from one branch into another

For example, you've got a branch `fixes/97-bottles-of-beer-on-the-wall`,
and you only add beers there. You have the branch `fixes/100-too-much-beer`
that will remove beers. But oops, you save a
commit that removes beers from the adding beers branch. Just `cherry-pick` to
pluck that commit and copy it to the removing beers branch.

```
 git checkout master #go to master to start new branch
 git checkout -b fixes/97-bottles-of-beer-on-the-wall
 git add beer1.txt beer2.txt; git commit
 git rm fosters.txt chang.txt coors.txt; git commit
 # oh right we want that last commit on it's own branch

 git checkout master
 git checkout -b fixes/100-too-much-beer
 git log fixes/97-bottles-of-beer-on-the-wall #let's see what commits are over there, output is:


 fb9a7cd removed chang, coors, fosters
 20f103c added beer1, beer2
 123xyz some last commit on master branch
 ...

 # since the too-much-beer branch is starting from a fresh copy of master, 
 # we just cherry pick the one commit we want here
 git cherry-pick fb9a7cd  # copies commit "removed chang, coors, fosters" onto too-much-beer branch
```
