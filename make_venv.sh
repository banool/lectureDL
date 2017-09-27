#!/bin/bash

# To run:
# > chmod 766 make_venv.sh
# > ./make_venv.sh
YES="Y"

ensure_homebrew_installed() {
    if ! hash brew 2>/dev/null; then
        echo HOMEBREW IS NOT INSTALLED. ARE YOU SURE YOU WANT TO INSTALL IT?
        read confirm
        if [ $confirm == $YES ]; then
            echo INSTALLING HOMEBREW.
            /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
            echo FINISHED INSTALLING HOMEBREW.
        fi
    fi
}

update_homebrew() {
    echo WOULD YOU LIKE TO UPDATE HOMEBREW \(Y\/N\)\?
    read confirm
    if [ $confirm == $YES ]; then
        echo UPDATING HOMEBREW.
        brew update
        echo FINISHED INSTALLING HOMEBREW.
    fi
}

ensure_pyenv_installed() {
    if ! hash pyenv 2>/dev/null; then
        echo INSTALLING PYENV.
        brew install pyenv
        echo FINISHED INSTALLING PYENV.
    fi
}

update_pyenv() {

    echo WOULD YOU LIKE TO UPDATE PYENV \(Y\/N\)\?
    read confirm
    if [ $confirm == $YES ]; then
        brew upgrade pyenv
    fi

    VERSION=3.6.1
    isinstalled=$(pyenv versions | grep $VERSION)
    if [ ${isinstalled:2} != $VERSION ]; then
        echo INSTALLING PYTHON 3.6.1 INTO YOUR PYTHON VIRTUAL ENVIRONMENTS.
        pyenv install 3.6.1
        echo FINISHED INSTALLING PYTHON 3.6.1 INTO YOUR PYTHON VIRTUAL ENVIRONMENTS.
    fi
}

make_venv() {
    VENV_NAME=myvenv
    if [ ! -d "$VENV_NAME" ]; then
        echo CREATING PYTHON VIRTUAL ENVIRONMENT
        VENV_NAME=myvenv
        python3.6 -m venv $VENV_NAME --without-pip
        # python -m venv $VENV_NAME
        source $VENV_NAME/bin/activate
        wget https://bootstrap.pypa.io/get-pip.py
        python get-pip.py
        pip install -r requirements.txt
        deactivate
        echo FINISHED CREATING PYTHON VIRTUAL ENVIRONMENT
    fi
}


warning() {
    echo ---------------------------------------------------------------------
    echo WARNING! IF YOU DO NOT USE HOMEBREW:
    echo THIS SCRIPT INSTALLS HOMEBREW IF IT IS NOT INSTALLED. 
    echo  
    echo IT DOES THIS SO THAT IT CAN UPGRADE PYENV. PYENV IS UPGRADED
    echo TO ENSURE PYTHON 3.6 CAN BE INSTALLED INTO A PYTHON VIRTUAL
    echo ENVIRONMENT. THIS IS BECAUSE THE PROGRAM USES FEATURES ONLY AVAILABLE
    echo FROM PYTHON 3.6.
    echo ---------------------------------------------------------------------
    echo WOULD LIKE TO CONTINUE \(Y\/N\)\?
    read user_answer
    if [ $user_answer == $YES ]; then
        echo ARE YOU SURE? ENTER Y TO CONFIRM.
        read confirmation
        if [ $confirmation == $YES ]; then
            ensure_homebrew_installed
            update_homebrew
            ensure_pyenv_installed
            update_pyenv
            make_venv
        fi
    fi
    echo FINISHED \:\) HAVE A GREAT DAY\!
}

warning
